'use client'

import { useState, useEffect } from 'react'
import '98.css/dist/98.css'

export function Taskbar() {
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    // Update time every second
    const updateTime = () => {
      const now = new Date()
      const hours = now.getHours()
      const minutes = now.getMinutes()
      const period = hours >= 12 ? 'PM' : 'AM'
      const formattedHours = hours % 12 || 12
      const formattedMinutes = minutes.toString().padStart(2, '0')
      setCurrentTime(`${formattedHours}:${formattedMinutes} ${period}`)
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className="win98"
      style={{
        position: 'fixed',
        bottom: '0',
        left: '0',
        right: '0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '2px 4px',
        backgroundColor: '#c0c0c0',
        borderTop: '1px solid #fff',
        boxShadow: 'inset 0 1px 0 0 #dfdfdf, inset 0 0 0 1px #9e9e9e'
      }}
    >
      <div className="field-row" style={{ margin: 0 }}>
        <button className="active" style={{ marginRight: '4px', display: 'flex', alignItems: 'center' }}>
          <img
            src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAGbUExURUxpcZac6dOV1Ifqz5So6Ifp3JqY6Kiz3K6z3Zmc6Jmb6J+Y5uyWzong4eqX1Yfq0+eY5ZSm5+6Y1+2Xx+6XxO2X1e+YyYjo5Yza6onn5OuW0orh6IzS6Y/G6eyY4Ifo2Ifq3Yfp1tiX5eiZ54fpzofpzMWX586X55Sj6duZ6pSo6aaX6Yzc66yX6aGV5o6955Ct5ozV6Y/K6rKX6Yfq1bmX6ayU45Wf6emX4ZWe6bWV5cGY6YfqzuyZ6MmY6pK16cCW5+SW4JSr6emZ6b+X6Ynk6JyY6Z+X6ZmY6cGY6qmX6a6X6eua6dOY6sqY6rOX6baX6b2X6Zae6d6a6uSa6pia6bGX6aWX6e+a55eb6ema6bqX6dqZ6onl6Ynn6KeX6aKX6ZSn6ZWh6c2Y6pK76pHD6u+a4I/K6o7S65Ow6ZSq6ZSk6dCY64jp5caY6o/N6ozc68SY6u+a5JSt6ZDH6o3Y65G/6pOz6orh6+Ga6pWg6Yjq4JK36vCZ2fCZ0u6a6Y3V64ve69yZ6ofq2diZ6taZ6pK16eea6qmW6I/XqXQAAABGdFJOUwD1GVYZG70HA1aWElYSHf1WIfeWtsT8tsSWElVWnqam9dtl9DtlO1ZlZTv19MT5trb1+VbEpqWl2tra2/Tb9NrzO/M8//lEUVHVAAAACXBIWXMAAC4jAAAuIwF4pT92AAAAV3pUWHRSYXcgcHJvZmlsZSB0eXBlIGlwdGMAAHic4/IMCHFWKCjKT8vMSeVSAAMjCy5jCxMjE0uTFAMTIESANMNkAyOzVCDL2NTIxMzEHMQHy4BIoEouAOoXEXTyQjWVAAAcJ0lEQVQ4T5WT63/SQBCHAyIQQHrZ2tse2tZ63/dbCeG6kB5pqTWIxqOAgrUtYKlKKX7sMzvbhahtfD5k5rczz+xO9mL"
            alt=""
            style={{ width: '20px', height: '20px', marginRight: '6px' }}
          />
          <span>Nightwave Plaza</span>
        </button>
        <button className="active" style={{ marginRight: '4px' }}>
          News
        </button>
      </div>
      <div style={{
        minWidth: '60px',
        textAlign: 'center',
        padding: '2px 6px',
        border: '1px solid #888',
        background: '#fff',
        fontSize: '12px'
      }}>
        {currentTime}
      </div>
    </div>
  )
}
