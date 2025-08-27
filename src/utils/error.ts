export function unknownErrorToPlain(error: unknown): object {
  if (error instanceof Error) {
    return errorToPlain(error);
  }
  if (typeof error === 'string') {
    return {
      message: error,
    };
  }
  if (typeof error === 'object' && error !== null) {
    return error;
  }
  if (typeof error === 'undefined') {
    return {};
  }
  return {
    message: `Unhandled Type Error: ${error as string}`,
  };
}


export function unknownErrorToString(error: unknown): string {
  return JSON.stringify(unknownErrorToPlain(error), null, 2);
}

function errorToPlain(error: Error): object {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    cause: unknownErrorToPlain(error.cause),
  };
}