import { database } from '@/model/index.web'
import { Model } from '@nozbe/watermelondb'
import { useEffect, useState } from 'react'

/**
 * Loads and observes a record by id. Returns undefined while loading and null if the record does not exist
 * (e.g. a stale link after a reload), so the caller can close the screen instead of crashing.
 */
export const useObservedRecord = <T extends Model>(table: string, id: string | undefined): T | null | undefined => {
    const [state, setState] = useState<{ id: string; record: T | null }>()

    useEffect(() => {
        if (!id) return
        const subscription = database
            .get<T>(table)
            .findAndObserve(id)
            .subscribe({
                next: (record) => setState({ id, record }),
                error: () => setState({ id, record: null }),
                // WatermelonDB completes the observable when the record is deleted
                complete: () => setState({ id, record: null }),
            })
        return () => subscription.unsubscribe()
    }, [table, id])

    if (!id) return null
    return state?.id === id ? state.record : undefined
}
