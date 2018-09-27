export interface AsyncData<T = {}> {
    action: string;
    data?: T;
}

interface PromiseStore<T = {}> {
    key: string;
    promise: Promise<AsyncData<T>>;
    asyncData: AsyncData<T>;
    resolve: (data?: AsyncData<T>) => void;
    reject: (reason?: string) => void;
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
    createPromise<T = {}>(action: string, data?: T, withTimeout?: number) {
        const key = `${action}-${this.promiseCounter_++}`;
        const dict: Partial<PromiseStore<T>> = {
            key,
            asyncData: {
                action,
                data
            }
        };

        dict.promise = new Promise<AsyncData<T>>((resolve, reject) => {
            dict.resolve = resolve;
            dict.reject = reject;

            if (withTimeout !== undefined) {
                window.setTimeout(() => {
                    this.removePromise(key);
                    reject(`${key} timed out after ${withTimeout} millis.`);
                }, withTimeout);
            }
        });

        this.promises_.set(key, dict as PromiseStore<T>);
        return key;
    }

    /**
     * Resolves a previously created promise.
     * @param key The key of the stored promise.
     * @param data Optional data that is passed along to the promise, will be merged with the initial data.
     */
    resolve<T extends object>(key: string, data?: T) {
        const promise = this.promises_.get(key) as PromiseStore<T>|undefined;
        if (promise === undefined) {
            throw new Error(`Promise ${key} does not exist or has already been resolved!`);
        }

        const { asyncData } = promise;
        if (data !== undefined) {
            asyncData.data = Object.assign(asyncData.data || {}, data);
        }

        this.removePromise(key);
        promise.resolve(asyncData);
    }

    /**
     * Get the promises for an array of keys. Missing promises are filtered out.
     * @param keys The keys to get the promises for.
     */
    getPromises<T = {}>(keys: string[]) {
        return this.get<T>(keys).map(dict => dict!.promise);
    }

    /**
     * Get the promise for 1 key.
     * @param key The key to get the promise for.
     */
    getPromise<T>(key: string) {
        return this.promises_.get(key)!.promise as Promise<AsyncData<T>>;
    }

    /**
     * Removes a promise from memory. needs to be called when a promise is no longer used.
     * @param key The key of the stored promise.
     */
    removePromise(key: string) {
        this.promises_.delete(key);
    }

    /**
     * Reject the remaining promises.
     * @param keys The keys to reject.
     */
    protected rejectRemaining(keys: string[]) {
        this.get(keys).forEach(dict => {
            dict.reject('Reject remaining');
            this.removePromise(dict.key);
        });
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

    private get<T = {}>(keys: string[]) {
        return keys.map(key => this.promises_.get(key))
            .filter(dict => dict !== undefined) as Array<PromiseStore<T>>;
    }
}
