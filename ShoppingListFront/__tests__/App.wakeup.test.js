/* global jest, test, expect */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
import { wakeUpServer } from '../src/services/http';

jest.mock('../src/services/http', () => ({
  ...jest.requireActual('../src/services/http'),
  wakeUpServer: jest.fn(),
}));

test('the app starts waking the server as soon as it opens', async () => {
  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(<App />);
  });
  expect(wakeUpServer).toHaveBeenCalledTimes(1);
});
