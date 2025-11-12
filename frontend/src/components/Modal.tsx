// frontend/src/components/Modal.tsx
import { motion, AnimatePresence } from "framer-motion";

export default function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-[#0f0f0f] border border-[#303030] shadow-[0_0_25px_#ffdf40] text-white rounded-xl p-6 max-w-md w-full"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
          >
            {children}

            <button
              onClick={onClose}
              className="mt-6 w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 
              font-semibold tracking-wide transition-all"
            >
              OK
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
