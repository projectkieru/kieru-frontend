import { Home, Plus, List, Lock } from 'lucide-react';

/**
 * Shared navigation configuration for Sidebar and MobileNav
 * Single source of truth to maintain consistency
 * Note: Logo image is in public folder, referenced by URL path
 */

export const APP_NAME = 'Kieru';
export const APP_LOGO_IMAGE = '/kieru_full_logo.webp';

export const NAV_TABS = [
   { id: 'home', label: 'Home', icon: Home },
   { id: 'create', label: 'Create', icon: Plus },
   { id: 'secrets', label: 'Secrets', icon: List },
   { id: 'view', label: 'View Secret', icon: Lock }
];
