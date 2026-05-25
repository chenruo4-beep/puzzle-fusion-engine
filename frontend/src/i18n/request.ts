import {getRequestConfig} from 'next-intl/server';
import {routing} from './routing';
 
export default getRequestConfig(async ({requestLocale}) => {
  // 通常，`requestLocale`是[locale]的动态参数
  // https://next-intl.dev/docs/getting-started/app-router/with-i18n-routing#with-i18n-routing
  let locale = await requestLocale;
 
  // 确保有有效的locale
  if (!locale || !(routing.locales as readonly string[]).includes(locale)) {
    locale = routing.defaultLocale;
  }
 
  return {
    locale,
    messages: (await import(`../locales/${locale}.json`)).default
  };
});