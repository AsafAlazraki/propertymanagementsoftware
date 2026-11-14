import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
// Only `MotionConfig` is imported here: a context provider of a few lines. The animation
// engine itself still loads with the screens that animate.
import { MotionConfig } from 'motion/react'
import { router } from './app/router'
import './styles/app.css'

const root = document.getElementById('root')
if (!root) throw new Error('index.html has no #root')

createRoot(root).render(
  <StrictMode>
    {/* Every `motion` animation follows the device's reduced-motion setting. The CSS rule in
        app.css covers CSS animation; this covers the ones driven from JavaScript, which that
        rule cannot reach. Movement and layout animation are dropped; fades are kept. */}
    <MotionConfig reducedMotion="user">
      <RouterProvider router={router} />
    </MotionConfig>
  </StrictMode>,
)
