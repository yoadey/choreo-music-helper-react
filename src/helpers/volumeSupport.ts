type VolumeElement = { volume: number }

/**
 * iOS Safari ignores the volume of media elements (it is always 1), so lead-in and lead-out volumes
 * cannot work there. Detects this by setting a volume and reading it back.
 */
export const supportsVolumeControl = (
    createElement: () => VolumeElement | undefined = () =>
        typeof document !== 'undefined' ? document.createElement('audio') : undefined,
): boolean => {
    const element = createElement()
    if (!element) return true
    element.volume = 0.5
    return element.volume === 0.5
}
