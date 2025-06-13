// import { provideServerRendering, withRoutes } from '@angular/ssr';
// Remove or update any code below that uses provideServerRendering or withRoutes for Angular 19 compatibility.

import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

const serverConfig: ApplicationConfig = {
  providers: [
    // provideServerRendering(withRoutes(serverRoutes))
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
