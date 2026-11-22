/* global jest, describe, beforeEach, afterEach, test, expect */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Alert } from 'react-native';
import JoinListModal from '../src/components/JoinListModal/JoinListModal';
import { joinListByCode } from '../src/services/api';

jest.mock('../src/services/api', () => ({
  joinListByCode: jest.fn(),
}));

const { act } = ReactTestRenderer;

let tree;
let alertSpy;

const renderModal = async (props = {}) => {
  const onClose = jest.fn();
  const onJoined = jest.fn();
  await act(async () => {
    tree = ReactTestRenderer.create(
      <JoinListModal visible onClose={onClose} onJoined={onJoined} {...props} />,
    );
  });
  const byTestId = id => tree.root.findAll(n => n.props.testID === id)[0];
  return { byTestId, onClose, onJoined };
};

describe('JoinListModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(async () => {
    alertSpy.mockRestore();
    await act(async () => tree.unmount());
  });

  test('pasting the whole WhatsApp message joins with the extracted code', async () => {
    const list = { id: 5, name: 'סופר', owner_id: 2, is_owner: false };
    joinListByCode.mockResolvedValue(list);
    const { byTestId, onJoined } = await renderModal();

    await act(async () => {
      byTestId('join_code_input').props.onChangeText(
        'הוזמנת להצטרף לרשימה "סופר" ב-ShopLi. קוד ההזמנה: K7M2Q9',
      );
    });
    await act(async () => {
      await byTestId('join_submit_button').props.onPress();
    });

    expect(joinListByCode).toHaveBeenCalledWith('K7M2Q9');
    expect(onJoined).toHaveBeenCalledWith(list);
  });

  test('a server error is shown and the dialog stays open', async () => {
    joinListByCode.mockRejectedValue(new Error('קוד ההזמנה לא נמצא'));
    const { byTestId, onClose, onJoined } = await renderModal();

    await act(async () => {
      byTestId('join_code_input').props.onChangeText('ABC123');
    });
    await act(async () => {
      await byTestId('join_submit_button').props.onPress();
    });

    expect(alertSpy).toHaveBeenCalledWith('שגיאה', 'קוד ההזמנה לא נמצא');
    expect(onJoined).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  test('empty input shows an error without calling the server', async () => {
    const { byTestId } = await renderModal();

    await act(async () => {
      await byTestId('join_submit_button').props.onPress();
    });

    expect(alertSpy).toHaveBeenCalledWith('שגיאה', 'אנא הזן קוד הזמנה');
    expect(joinListByCode).not.toHaveBeenCalled();
  });
});
