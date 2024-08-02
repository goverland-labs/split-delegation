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

export function sendToNats(events: DelegateEvent[]) {
    console.info(
        `Sending ${events.length} evens to nats subject...`
    )

    console.log("publish...", events)

    const subject = "core.delegate.upsert";
    const nc = connect({servers: "127.0.0.1:4222"});

    // fixme: send json only
    events.forEach(event => nc.publish(subject, event));
    nc.drain();
}