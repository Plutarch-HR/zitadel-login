import { ExclamationTriangleIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import { clsx } from "clsx";
import { ReactNode } from "react";

type Props = {
  children: ReactNode;
  type?: AlertType;
};

export enum AlertType {
  ALERT,
  INFO,
}

const yellow = "bg-[#F7EEDD] border border-[#B4690E]/30 text-[#8A5210] dark:bg-[rgba(180,105,14,0.15)] dark:text-[#E0A64A]";
// const red =
//   "border-red-600/40 dark:border-red-500/20 bg-red-200/30 text-red-600 dark:bg-red-700/20 dark:text-red-200";
const neutral = "bg-[var(--glas-chip)] border border-[var(--glas-rand)] text-[var(--glas-text)]";

export function Alert({ children, type = AlertType.ALERT }: Props) {
  return (
    <div
      className={clsx("flex scroll-px-40 flex-row items-center justify-center rounded-md border py-2 pr-2", {
        [yellow]: type === AlertType.ALERT,
        [neutral]: type === AlertType.INFO,
      })}
    >
      {type === AlertType.ALERT && <ExclamationTriangleIcon className="mr-2 ml-2 h-5 w-5 flex-shrink-0" />}
      {type === AlertType.INFO && <InformationCircleIcon className="mr-2 ml-2 h-5 w-5 flex-shrink-0" />}
      <span className="w-full text-sm">{children}</span>
    </div>
  );
}
