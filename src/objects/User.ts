export class User {
    id: string | undefined;

    constructor(readonly email: string, readonly password: string) {}
}
