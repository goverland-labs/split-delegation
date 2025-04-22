import {connect} from "nats";
import {DelegationEvent} from "@prisma/client";
import rowToAction from "./rowToAction";
import spaceName from "./spaceName";

export const ACTION_SET = "set";
export const ACTION_CLEAR = "clear";
export const ACTION_EXPIRE = "expire";

export type DelegationDetails = {
    address: string;
    weight: number;
}

export type Delegations = {
    details: DelegationDetails[];
    expiration: number;
}

export type DelegateEvent = {
    action: string;
    address_from: string;
    original_space_id: string;
    chain_id: string;
    block_number: number;
    block_timestamp: number;
    delegations: Delegations;
}

// todo: how to reconnect on error
export function sendToNats(events: DelegateEvent[]) {
    if (events.length == 0) {
        return
    }

    console.info(
        `Sending ${events.length} evens to nats subject...`
    )

    const subject = process.env.NATS_SUBJECT || "aggregator.delegate.updated";
    connect({servers: process.env.NATS_CONNECT || "127.0.0.1:4222"})
        .then(nc => {
            for (const event of events) {
                nc.publish(subject, JSON.stringify(event))
            }

            nc.drain().finally(() => console.log("nats connection was closed"))
        })
}

// publishEvents prepare events to core platform events and send it to the queue
export function publishEvents(entities: DelegationEvent[]) {
    let actions = rowToAction(entities)

    let events: DelegateEvent[] = [];
    for (const idx in actions) {
        const action = actions[idx];

        if ('set' in action) {
            let dd: Delegations = {
                expiration: action.set.expiration,
                details: [],
            };

            for (const j in action.set.delegation) {
                dd.details.push({
                    weight: action.set.delegation[j].weight,
                    address: action.set.delegation[j].delegate,
                })
            }

            events.push({
                action: ACTION_SET,
                address_from: entities[idx].account,
                block_number: entities[idx].blockNumber,
                block_timestamp: entities[idx].blockTimestamp,
                chain_id: entities[idx].chainId.toString(),
                original_space_id: spaceName(entities[idx].spaceId),
                delegations: dd,
            })
        }

        if ('clear' in action) {
            events.push({
                action: ACTION_CLEAR,
                address_from: entities[idx].account,
                block_number: entities[idx].blockNumber,
                block_timestamp: entities[idx].blockTimestamp,
                chain_id: entities[idx].chainId.toString(),
                original_space_id: spaceName(entities[idx].spaceId),
                delegations: {
                    details: [],
                    expiration: 0,
                },
            })
        }

        if ('expire' in action) {
            events.push({
                action: ACTION_EXPIRE,
                address_from: entities[idx].account,
                block_number: entities[idx].blockNumber,
                block_timestamp: entities[idx].blockTimestamp,
                chain_id: entities[idx].chainId.toString(),
                original_space_id: spaceName(entities[idx].spaceId),
                delegations: {
                    details: [],
                    expiration: action.expire.expiration,
                },
            })
        }
    }

    sendToNats(events)
}
