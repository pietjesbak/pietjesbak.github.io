export enum AsyncActions {
    JOIN = 'join',
    PLAY = 'play',
    DRAW = 'draw',
    NOPE = 'nope'
}

export interface AsyncData {
    action: AsyncActions;
    data?: object;
}

interface PromiseStore {
    promise: Promise<AsyncData>;
    asyncData: AsyncData;
    resolve: (data?: AsyncData) => void;
    reject: (reason?: string) => void;
    resolved: boolean;
}

export class AsyncHandler {
    private promiseCounter_ = 0;

    private promises_: Map<string, PromiseStore> = new Map();


    /**
     * Creates a promise and returns an identifier.
     * @param action The action.
     * @param extraData Initial data that will be passed to the promise, will be merged with the additional data that is added when resolving.
     * @param withTimeout Optional timeout for the promise. The promise is rejected when the timeout is reached.
     */
    createPromise(action: AsyncActions, data?: object, withTimeout?: number) {
        const key = `${action}-${this.promiseCounter_++}`;
        const dict: Partial<PromiseStore> = {
            asyncData: {
                action,
                data
            },
            resolved: false
        };

        dict.promise = new Promise<AsyncData>((resolve, reject) => {
            dict.resolve = resolve;
            dict.reject = reject;

            if (withTimeout !== undefined) {
                window.setTimeout(() => {
                    this.removePromise(key);
                    reject();
                }, withTimeout);
            }
        });

        this.promises_.set(key, dict as PromiseStore);
        return key;
    }

    /**
     * Resolves a previously created promise.
     * @param key The key of the stored promise.
     * @param data Optional data that is passed along to the promise, will be merged with the initial data.
     */
    resolve(key: string, data?: object) {
        const promise = this.promises_.get(key);
        if (promise === undefined) {
            throw new Error(`Promise ${key} does not exist or has already been resolved!`);
        }

        const { asyncData } = promise;
        asyncData.data = { ...asyncData.data, ...data };

        this.removePromise(key);
        promise.resolve(asyncData);
    }



    /**
     * Get the promises for an array of keys. Missing promises are filtered out.
     * @param keys The keys to get the promises for.
     */
    getPromises(keys: string[]) {
        return this.get(keys).map(dict => dict!.promise);
    }

    /**
     * Get the promise for 1 key.
     * @param key The key to get the promise for.
     */
    getPromise(key: string) {
        return this.promises_.get(key)!.promise;
    }

    /**
     * Removes a promise from memory. needs to be called when a promise is no longer used.
     * @param key The key of the stored promise.
     */
    removePromise(key: string) {
        this.promises_.delete(key);
    }

    protected rejectRemaining(keys: string[]) {
        this.get(keys).forEach(dict => dict.reject('Reject remaining'));
    }

    /**
     * Creates a promise that resolves after the given time.
     * @param milis The amount of miliseconds to wait.
     */
    protected wait(milis: number) {
        return new Promise(resolve => {
            window.setTimeout(resolve, milis);
        });
    }

    private get(keys: string[]) {
        return keys.map(key => this.promises_.get(key))
            .filter(dict => dict !== undefined) as PromiseStore[];
    }
}
