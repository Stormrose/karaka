export function delay(milliseconds: number): Promise<void> {
    return new Promise<void>(resolve => {
            setTimeout(() => {
                resolve()
            }, milliseconds)
        })
}
export async function sleep(milliseconds: number): Promise<void> {
    await delay(milliseconds)
}
//export const Yield = () => sleep(0)
export const Yield = async () => await setImmediatePromise()

function setImmediatePromise(): Promise<void> {
    return new Promise<void>(resolve => {
            setImmediate(() => {
                resolve()
            })
        })
}
