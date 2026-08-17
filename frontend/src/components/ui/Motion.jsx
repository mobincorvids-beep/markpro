/**
 * Shared motion primitives (framer-motion).
 *
 * These wrap page content and cards so the whole app gets one consistent,
 * restrained animation language instead of ad-hoc CSS transitions.
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';

const EASE = [0.22, 1, 0.36, 1];

export function PageTransition({ children }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.24, ease: EASE }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** Fade + lift a block into view once it scrolls into the viewport. */
export function Reveal({ children, delay = 0, className, style }) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.35, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Card surface with a subtle hover lift. */
export function MotionCard({ children, className, style, delay = 0, ...rest }) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE, delay }}
      whileHover={{ y: -3 }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Dropdown / popover animation wrapper. */
export function Popover({ open, children, className, style }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={className}
          style={style}
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.16, ease: EASE }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Animated react-router link, used for dashboard/module tiles. */
export const MotionLink = motion(Link);

export const tileMotion = (i = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: EASE, delay: Math.min(i * 0.03, 0.3) },
  whileHover: { y: -4 },
  whileTap: { scale: 0.985 },
});

export { motion, AnimatePresence };
