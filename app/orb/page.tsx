'use client';

import { motion } from 'framer-motion';

export default function OrbPage() {
  return (
    <div className="relative min-h-screen bg-black flex flex-col items-center justify-center overflow-hidden">
      {/* Background Starfield Effect */}
      <div className="absolute inset-0 z-0 opacity-30 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-900 via-black to-black" />

      {/* The Masterchief Orb */}
      <motion.div
        className="relative z-10 flex items-center justify-center"
        animate={{
          scale: [1, 1.05, 1],
          filter: [
            'drop-shadow(0 0 30px rgba(34, 197, 94, 0.4))',
            'drop-shadow(0 0 60px rgba(34, 197, 94, 0.8))',
            'drop-shadow(0 0 30px rgba(34, 197, 94, 0.4))',
          ],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Core */}
        <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-full bg-gradient-to-br from-green-300 via-green-600 to-green-900 mix-blend-screen animate-spin-slow">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-green-400 to-transparent opacity-50 backdrop-blur-sm" />
        </div>
        
        {/* Inner glow mask */}
        <div className="absolute inset-0 rounded-full shadow-[inset_0_0_50px_rgba(0,0,0,0.8)]" />
      </motion.div>

      {/* Typography layer */}
      <div className="relative z-20 mt-16 text-center space-y-4">
        <motion.h1 
          className="text-4xl sm:text-6xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-green-100 to-green-600 uppercase"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 1 }}
        >
          Masterchief
        </motion.h1>
        <motion.p
          className="text-green-400/60 font-mono tracking-widest text-sm sm:text-base"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
        >
          SYSTEM ONLINE. AWAITING COMMANDS.
        </motion.p>
      </div>
    </div>
  );
}
