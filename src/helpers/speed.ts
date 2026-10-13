export const MIN_SPEED = 0.5
export const MAX_SPEED = 2.0

const round2 = (value: number) => Math.round(value * 100) / 100

export const clampSpeed = (speed: number) => Math.max(MIN_SPEED, Math.min(MAX_SPEED, round2(speed)))

export const stepSpeed = (speed: number, delta: number) => clampSpeed(speed + delta)

/**
 * The speed slider runs from 0 to 2: the lower half covers 0.5–1.0 (finer steps for slow practice),
 * the upper half 1.0–2.0.
 */
export const sliderToSpeed = (value: number) => clampSpeed(value <= 1 ? MIN_SPEED + value / 2 : value)

export const speedToSlider = (speed: number) => (speed <= 1 ? (speed - MIN_SPEED) * 2 : speed)
