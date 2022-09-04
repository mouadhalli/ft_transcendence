export enum twoFactorState {
    NOT_ACTIVE = "not_active",
    CONFIRMED = "confirmed",
    NOT_CONFIRMED = "not_confirmed"
}

export interface jwtPayload {
    id: number,
    username: string,
    twofaState: twoFactorState
}
