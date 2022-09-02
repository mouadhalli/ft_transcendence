export enum twoFactorState {
    "notactive",
    "confirmed",
    "notconfirmed"
}

export interface jwtPayload {
    id: number,
    username: string,
    twofa: twoFactorState
}
