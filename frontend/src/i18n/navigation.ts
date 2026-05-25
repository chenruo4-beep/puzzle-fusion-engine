import {createNavigation} from 'next-intl/navigation';
import {routing} from './routing';
 
// 轻量级的导航工具（替代next/navigation）
export const {Link, redirect, usePathname, useRouter, getPathname} =
  createNavigation(routing);