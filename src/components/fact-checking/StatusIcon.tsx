import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { FactCheckItem } from "./types";

export const StatusIcon = ({ status }: { status: FactCheckItem["status"] }) => {
  switch (status) {
    case "verified":
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case "debunked":
      return <XCircle className="h-5 w-5 text-red-500" />;
    case "flagged":
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    default:
      return <AlertTriangle className="h-5 w-5 text-gray-500" />;
  }
};