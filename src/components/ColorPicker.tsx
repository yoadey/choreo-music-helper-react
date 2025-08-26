import { FontAwesome6 } from '@expo/vector-icons'
import React from 'react'

/**
 * Simple Color-Picker
 */
export interface ColorPickerProps {
    colors: string[]
    value?: string
    onChange?: (color: string) => void
    circleSize?: number
    gap?: number
    ariaLabel?: string
    className?: string
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
    colors = [],
    value,
    onChange,
    circleSize = 32,
    gap = 6,
    ariaLabel = 'Colorpicker',
    className = '',
}) => {
    const size = circleSize

    return (
        <div
            role="radiogroup"
            aria-label={ariaLabel}
            className={className}
            style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap,
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
            }}
        >
            {colors.map((c: string) => {
                const selected = value === c
                return (
                    <button
                        key={c}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        title={c}
                        onClick={() => onChange?.(c)}
                        onKeyDown={(e: React.KeyboardEvent<HTMLButtonElement>) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                onChange?.(c)
                            }
                        }}
                        style={{
                            width: size,
                            height: size,
                            borderRadius: '9999px',
                            backgroundColor: c,
                            border: '2px solid rgb(167, 167, 167)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            position: 'relative',
                            padding: 0,
                            outlineOffset: 3,
                            fontSize: Math.round(size * 0.6),
                            color: '#ffffff',
                            flex: '0 0 auto',
                        }}
                    >
                        {selected && (
                            <FontAwesome6
                                name="check"
                                aria-hidden="true"
                                focusable="false"
                                size={20}
                                color="#ffffff"
                            />
                        )}
                    </button>
                )
            })}
        </div>
    )
}

export default ColorPicker
