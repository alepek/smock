import referenceScenario from './__data__/scenario.mjs';
import referenceDefaultScenario from './__data__/default.mjs';

import { findMatchingEndpoint, loadScenario, responseData } from '../utils';

describe('endpoint matching', () => {
  it('does not match invalid endpoints', () => {
    const result = findMatchingEndpoint({
      path: '/items/123',
    }, [{
      request: {},
      response: {},
    }]);

    expect(result).toBe(undefined);
  });

  it('matches valid endpoints', () => {
    const endpoint = {
      request: {
        path: '/items',
      },
      response: {
        status: 200,
      },
    };
    const result = findMatchingEndpoint({
      path: '/items/123',
    }, [endpoint]);

    expect(result).toBe(endpoint);
  });

  it('tolerates empty request fields', () => {
    const endpoint = {
      request: {
        path: '/items',
      },
      response: {
        status: 200,
      },
    };
    const result = findMatchingEndpoint({
      path: '/items/123',
      cookies: {},
    }, [endpoint]);

    expect(result).toBe(endpoint);
  });

  it('matches valid regex endpoint', () => {
    const endpoint = {
      request: {
        path: '/item/\\d',
      },
      response: {
        status: 200,
      },
    };
    const result = findMatchingEndpoint({
      path: '/item/123/foo',
    }, [endpoint]);

    expect(result).toBe(endpoint);
  });

  it('matches the first valid endpoints', () => {
    const endpoint = {
      request: {
        path: '/items',
      },
      response: {
        status: 200,
      },
    };
    const endpoints = [endpoint, {
      ...endpoint,
      response: { status: 404 },
    }];
    const result = findMatchingEndpoint({
      path: '/items/123',
    }, endpoints);

    expect(result).toBe(endpoint);
  });

  it('respects query', () => {
    const endpoints = [
      {
        request: {
          path: '/items',
          query: {
            id: 1,
          },
        },
        response: {
          status: 200,
        },
      },
      {
        request: {
          path: '/items',
          query: {
            id: 2,
          },
        },
        response: {
          status: 404,
        },
      },
    ];
    const result = findMatchingEndpoint({
      path: '/items',
      query: {
        id: 2,
      },
    }, endpoints);

    expect(result).toBe(endpoints[1]);
  });

  it('matches endpoint with custom validator', () => {
    expect.assertions(2);

    const endpoints = [{
      request(req) {
        expect(req.path).toBe('/items/123');
        return true;
      },
      response: {
        status: 200,
      },
    }];
    const result = findMatchingEndpoint({
      path: '/items/123',
    }, endpoints);

    expect(result).toBe(endpoints[0]);
  });
});

describe('response data parsing', () => {
  it('extracts static data', () => {
    const data = { foo: 123 };
    const endpoint = {
      response: {
        data,
      },
    };

    const result = responseData({}, endpoint);
    expect(result).toBe(data);
  });

  it('accepts a function as data', () => {
    const req = { foo: 1 };
    const endpoint = {
      response: {
        data: r => r,
      },
    };

    const result = responseData(req, endpoint);
    expect(result).toBe(req);
  });
});

describe('loadScenario', () => {
  const options = {
    logger: {
      error: jest.fn(),
    },
    path: './__tests__/__data__',
    scenario: 'default',
  };

  it('loads the reference scenario', async () => {
    const scenario = await loadScenario({
      path: '/users',
      method: 'GET',
      query: { scenario: 'scenario', foo: 'bar', cookiesShould: 'doSuperSetMatching' },
      cookies: { track: 'this' },
    }, options);

    expect(scenario).toEqual(referenceScenario.endpoints[0]);
  });

  it('does not use the require cache', async () => {
    const load = () => loadScenario({
      path: '/impure',
      query: { scenario: 'impure' },
      method: 'GET',
    }, options);

    const first = await load();
    expect(first.response.data()).toEqual({ i: 1 });
    const second = await load();
    expect(second.response.data()).toEqual({ i: 1 });
    const third = await load();
    expect(third.response.data()).toEqual({ i: 1 });
  });

  it('loads the default scenario', async () => {
    const scenario = await loadScenario({
      path: '/colors',
      method: 'GET',
      query: {},
    }, options);

    expect(scenario).toEqual(referenceDefaultScenario.endpoints[0]);
  });

  it('respects the options path', async () => {
    const scenario = await loadScenario({
      path: '/colors',
      method: 'GET',
      query: {},
    }, {
      ...options,
      path: '.',
    });

    expect(scenario).not.toBeDefined();
  });
});
