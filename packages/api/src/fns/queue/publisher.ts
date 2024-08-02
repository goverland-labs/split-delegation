import {connect} from "nats";

export const ACTION_SET = "set";
export const ACTION_CLEAR = "clear";
export const ACTION_EXPIRE = "expire";
export const ACTION_OPT = "opt";

export type DelegateEvent = {
    action: string;
    address_from: string;
    address_to: string;
    chain_id: string;
    original_space_id: string;
    expired_at: number;
    weight: number;
    block_number: number;
}

// todo: how to reconnect on error
// todo: move server and subject to config
export function sendToNats(events: DelegateEvent[]) {
    if (events.length == 0) {
        return
    }

    console.info(
        `Sending ${events.length} evens to nats subject...`
    )

    const subject = "core.delegate.upsert";
    connect({servers: "127.0.0.1:4222"})
        .then(nc => {
            for (const event of events) {
                nc.publish(subject, JSON.stringify(event))
            }

            nc.drain().finally(() => console.log("nats connection was closed"))
        })
}