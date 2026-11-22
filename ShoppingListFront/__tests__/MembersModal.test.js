/* global jest, test, expect, beforeEach, afterEach */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Alert, Share } from 'react-native';
import MembersModal from '../src/components/MembersModal/MembersModal';
import {
  getListMembers,
  getInviteCode,
  resetInviteCode,
  removeListMember,
  leaveList,
} from '../src/services/api';

jest.mock('../src/services/api', () => ({
  getListMembers: jest.fn(),
  getInviteCode: jest.fn(),
  resetInviteCode: jest.fn(),
  removeListMember: jest.fn(),
  leaveList: jest.fn(),
}));

const { act } = ReactTestRenderer;

const MEMBERS = [
  { id: 1, username: 'owner_user', is_owner: true },
  { id: 2, username: 'member_user', is_owner: false },
];

let alertSpy;
beforeEach(() => {
  jest.clearAllMocks();
  getListMembers.mockResolvedValue(MEMBERS);
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const render = async props => {
  let tree;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <MembersModal
        visible
        listId={7}
        listName="סופר"
        isOwner
        onClose={jest.fn()}
        onLeft={jest.fn()}
        {...props}
      />,
    );
  });
  return tree;
};
const byTestId = (tree, id) =>
  tree.root.findAll(n => n.props.testID === id && n.props.onPress)[0];
const has = (tree, id) =>
  tree.root.findAll(n => n.props.testID === id).length > 0;
// מדמה לחיצה על כפתור ה-destructive בהתראת האישור האחרונה
const confirmLast = async () => {
  const buttons = alertSpy.mock.calls[alertSpy.mock.calls.length - 1][2];
  await act(async () => {
    await buttons.find(b => b.style === 'destructive').onPress();
  });
};

test('owner sees invite, reset and remove; member sees only leave', async () => {
  const owner = await render();
  expect(has(owner, 'invite_button')).toBe(true);
  expect(has(owner, 'reset_code_button')).toBe(true);
  expect(has(owner, 'remove_member_2')).toBe(true);
  expect(has(owner, 'remove_member_1')).toBe(false);
  expect(has(owner, 'leave_list_button')).toBe(false);

  const member = await render({ isOwner: false });
  expect(has(member, 'invite_button')).toBe(false);
  expect(has(member, 'reset_code_button')).toBe(false);
  expect(has(member, 'remove_member_2')).toBe(false);
  expect(has(member, 'leave_list_button')).toBe(true);
});

test('invite opens the share sheet with the list name and code', async () => {
  getInviteCode.mockResolvedValue('K7M2Q9');
  const shareSpy = jest
    .spyOn(Share, 'share')
    .mockResolvedValue({ action: Share.sharedAction });
  const tree = await render();
  await act(async () => {
    await byTestId(tree, 'invite_button').props.onPress();
  });
  expect(getInviteCode).toHaveBeenCalledWith(7);
  expect(shareSpy).toHaveBeenCalledWith({
    message:
      'הצטרפו לרשימת הקניות "סופר" שלי ב-ShopLi 🛒\n' +
      'באפליקציה: הרשימות שלי ← "הצטרפות עם קוד" ← הקוד: K7M2Q9',
  });
  expect(alertSpy).not.toHaveBeenCalled();
});

test('dismissing the share sheet shows no error', async () => {
  getInviteCode.mockResolvedValue('K7M2Q9');
  jest
    .spyOn(Share, 'share')
    .mockResolvedValue({ action: Share.dismissedAction });
  const tree = await render();
  await act(async () => {
    await byTestId(tree, 'invite_button').props.onPress();
  });
  expect(Share.share).toHaveBeenCalled();
  expect(alertSpy).not.toHaveBeenCalled();
});

test('reset code asks for confirmation first', async () => {
  resetInviteCode.mockResolvedValue('NEW123');
  const tree = await render();
  await act(async () => {
    byTestId(tree, 'reset_code_button').props.onPress();
  });
  expect(resetInviteCode).not.toHaveBeenCalled();
  await confirmLast();
  expect(resetInviteCode).toHaveBeenCalledWith(7);
});

test('remove asks for confirmation and refreshes the members', async () => {
  removeListMember.mockResolvedValue();
  const tree = await render();
  await act(async () => {
    byTestId(tree, 'remove_member_2').props.onPress();
  });
  expect(removeListMember).not.toHaveBeenCalled();
  getListMembers.mockResolvedValue([MEMBERS[0]]);
  await confirmLast();
  expect(removeListMember).toHaveBeenCalledWith(7, 2);
  expect(getListMembers).toHaveBeenCalledTimes(2);
  expect(has(tree, 'remove_member_2')).toBe(false);
});

test('leave asks for confirmation and calls onLeft', async () => {
  leaveList.mockResolvedValue();
  const onLeft = jest.fn();
  const tree = await render({ isOwner: false, onLeft });
  await act(async () => {
    byTestId(tree, 'leave_list_button').props.onPress();
  });
  expect(leaveList).not.toHaveBeenCalled();
  await confirmLast();
  expect(leaveList).toHaveBeenCalledWith(7);
  expect(onLeft).toHaveBeenCalled();
});

test('server errors are shown and session expiry is ignored', async () => {
  const err = new Error('אין הרשאה');
  getInviteCode.mockRejectedValueOnce(err);
  const tree = await render();
  await act(async () => {
    await byTestId(tree, 'invite_button').props.onPress();
  });
  expect(alertSpy).toHaveBeenCalledWith('שגיאה', 'אין הרשאה');
  alertSpy.mockClear();
  const expired = Object.assign(new Error('x'), { sessionExpired: true });
  getInviteCode.mockRejectedValueOnce(expired);
  await act(async () => {
    await byTestId(tree, 'invite_button').props.onPress();
  });
  expect(alertSpy).not.toHaveBeenCalled();
});
