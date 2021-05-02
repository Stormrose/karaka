import { Facts } from "../types/maintypes";

export function mergeFacts(a: Facts|undefined, b: Facts|undefined): Facts {
    return { ...a, ...b }
}
