declare module "lucide-react" {
  import { FC, SVGProps } from "react";

  export interface IconProps extends SVGProps<SVGSVGElement> {
    size?: number | string;
    color?: string;
    strokeWidth?: number | string;
  }

  export type Icon = FC<IconProps>;

  // Icons used in the project
  export const AlertCircle: Icon;
  export const AlertTriangle: Icon;
  export const ArrowLeft: Icon;
  export const ArrowRight: Icon;
  export const BarChart3: Icon;
  export const Bell: Icon;
  export const BellRing: Icon;
  export const Building: Icon;
  export const Building2: Icon;
  export const BookOpen: Icon;
  export const Check: Icon;
  export const CheckCircle: Icon;
  export const CheckCircle2: Icon;
  export const ChefHat: Icon;
  export const ChevronDown: Icon;
  export const ChevronRight: Icon;
  export const ChevronUp: Icon;
  export const Clock: Icon;
  export const Copy: Icon;
  export const CreditCard: Icon;
  export const DollarSign: Icon;
  export const Download: Icon;
  export const Edit: Icon;
  export const ExternalLink: Icon;
  export const Eye: Icon;
  export const EyeOff: Icon;
  export const FolderOpen: Icon;
  export const Globe: Icon;
  export const GripVertical: Icon;
  export const Image: Icon;
  export const Key: Icon;
  export const LayoutDashboard: Icon;
  export const LayoutGrid: Icon;
  export const List: Icon;
  export const Loader2: Icon;
  export const Lock: Icon;
  export const LogOut: Icon;
  export const Mail: Icon;
  export const Menu: Icon;
  export const MessageSquare: Icon;
  export const Minus: Icon;
  export const Monitor: Icon;
  export const Moon: Icon;
  export const Package: Icon;
  export const Pencil: Icon;
  export const Plus: Icon;
  export const QrCode: Icon;
  export const Receipt: Icon;
  export const RefreshCw: Icon;
  export const Settings: Icon;
  export const ShoppingBag: Icon;
  export const ShoppingCart: Icon;
  export const Sparkles: Icon;
  export const Star: Icon;
  export const Sun: Icon;
  export const Table: Icon;
  export const TableProperties: Icon;
  export const Trash2: Icon;
  export const TrendingUp: Icon;
  export const Truck: Icon;
  export const Upload: Icon;
  export const User: Icon;
  export const Users: Icon;
  export const Utensils: Icon;
  export const UtensilsCrossed: Icon;
  export const Volume2: Icon;
  export const VolumeX: Icon;
  export const X: Icon;
  export const XCircle: Icon;
}
