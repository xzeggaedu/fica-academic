import { 
  Users, 
  Building2, 
  Clock, 
  ListIcon,
  CheckSquare,
  UserPlus,
  Settings,
  Calendar,
  BookOpen,
  GraduationCap
} from "lucide-react";

export const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Users,
  Building2,
  Clock,
  CheckSquare,
  UserPlus,
  Settings,
  Calendar,
  BookOpen,
  GraduationCap,
  // Default fallback
  default: ListIcon,
};

export const getIcon = (iconName?: string): React.ComponentType<{ className?: string }> => {
  if (!iconName) return iconMap.default;
  return iconMap[iconName] || iconMap.default;
};
