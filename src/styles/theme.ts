import { Colors as BaseColors } from '@/constants/theme';

export const Theme = {
  colors: {
    ...BaseColors,
    primary: '#6366F1', // Indigo Accent
    secondary: '#10B981', // Emerald Green
    accent: '#8B5CF6', // Purple Accent
    
    // Status colors
    status: {
      reported: { bg: '#374151', text: '#9CA3AF', label: 'Reported' },
      verified: { bg: '#0369A1', text: '#38BDF8', label: 'Verified' },
      assigned: { bg: '#5B21B6', text: '#C084FC', label: 'Assigned' },
      in_progress: { bg: '#854D0E', text: '#FDE047', label: 'In Progress' },
      resolved: { bg: '#065F46', text: '#34D399', label: 'Resolved' },
      closed: { bg: '#1F2937', text: '#6B7280', label: 'Closed' },
      rejected: { bg: '#991B1B', text: '#FCA5A5', label: 'Rejected' },
    },

    // Category colors & icons (symbols)
    categories: {
      pothole: { color: '#F97316', label: 'Pothole', icon: 'square.grid.3x3' },
      water_leakage: { color: '#0EA5E9', label: 'Water Leakage', icon: 'drop.fill' },
      streetlight: { color: '#EAB308', label: 'Streetlight', icon: 'lightbulb.fill' },
      waste_management: { color: '#22C55E', label: 'Waste Management', icon: 'trash.fill' },
      road_damage: { color: '#EF4444', label: 'Road Damage', icon: 'exclamationmark.triangle.fill' },
      drainage: { color: '#6366F1', label: 'Drainage', icon: 'water.waves' },
      public_property_damage: { color: '#EC4899', label: 'Property Damage', icon: 'building.2.fill' },
      other: { color: '#6B7280', label: 'Other', icon: 'questionmark.circle.fill' }
    },

    // Severity colors
    severity: {
      low: '#22C55E',
      medium: '#EAB308',
      high: '#F97316',
      critical: '#EF4444'
    }
  },

  // Premium design styling rules
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    premium: {
      shadowColor: '#6366F1',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
    }
  },

  gradients: {
    indigoViolet: ['#6366F1', '#8B5CF6'],
    emeraldTeal: ['#10B981', '#059669'],
    sunsetOrange: ['#F97316', '#EF4444'],
    darkGlass: ['rgba(33, 34, 37, 0.7)', 'rgba(33, 34, 37, 0.4)'],
  }
};
export type AppTheme = typeof Theme;
export type IssueStatus = keyof typeof Theme.colors.status;
export type IssueCategory = keyof typeof Theme.colors.categories;
export type IssueSeverity = keyof typeof Theme.colors.severity;
