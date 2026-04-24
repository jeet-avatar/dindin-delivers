import serverless from 'serverless-http';
import { app } from './app';

const handlerInstance = serverless(app, {
  binary: false,
});

export const handler = async (event: any, context: any) => {
  context.callbackWaitsForEmptyEventLoop = false;
  return handlerInstance(event, context);
};
