import { motion, HTMLMotionProps } from "framer-motion";
import React from "react";

type MotionButtonProps = (
  | ({ as?: "button" } & HTMLMotionProps<"button">)
  | ({ as: "a" } & HTMLMotionProps<"a">)
) & {
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  loading?: boolean;
};

export default function MotionButton({
  as = "button",
  children,
  icon,
  className = "",
  loading = false,
  ...props
}: MotionButtonProps) {
  const MotionTag = motion[as]; // motion.button or motion.a

  return (
    <MotionTag
      whileHover={!loading ? { scale: 1.03 } : {}}
      whileTap={!loading ? { scale: 0.97 } : {}}
      transition={{ type: "spring", stiffness: 300 }}
      disabled={loading || (props as any).disabled}
      className={`w-full px-4 py-3 rounded-full font-medium flex items-center justify-center gap-2 relative ${
        loading ? "opacity-70 cursor-not-allowed" : ""
      } ${className}`}
      {...(props as any)}
    >
      {loading ? (
        <motion.span
          className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        />
      ) : (
        <>
          {icon && (
            <motion.span
              whileHover={{ rotate: [0, -10, 10, -5, 5, 0] }}
              transition={{ duration: 0.6 }}
              className="flex items-center"
            >
              {icon}
            </motion.span>
          )}
          {children}
        </>
      )}
    </MotionTag>
  );
}
