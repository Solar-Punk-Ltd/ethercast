import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { CircularProgress } from '@mui/material';
import { useEthers } from '@usedapp/core';

import { WithAsyncErrorBoundary } from '../../hooks/WithErrorBoundary';
import { ParticipantDetails, UserWithIndex } from '../../libs/chat/src/core';
import { assertBatchId } from '../../utils/formValidation';
import { Button } from '../Button/Button';
import { FormContainer } from '../FormContainer/FormContainer';
import { ControllerTextInput } from '../TextInput/ControllerTextInput';

import './ChatModal.scss';

interface ChatModalProps {
  onAction: ({ participant, key, stamp }: ParticipantDetails) => Promise<void>;
  user?: UserWithIndex;
}

interface FormData {
  nick: string;
  key: string;
  stamp: string;
}

const formFields = [
  // TODO: keystore feat
  {
    name: 'nick',
    label: 'Please provide your nick name',
    defaultValue: '',
    rules: { required: 'Nick is required' },
  },
  {
    name: 'key',
    label: 'Please provide your key for the feed',
    defaultValue: '',
    rules: { required: 'Key is required' },
  },
  {
    name: 'stamp',
    label: 'Please provide a valid stamp',
    defaultValue: '',
    rules: { required: 'Stamp is required', validate: assertBatchId },
  },
];

export const ChatModal: React.FC<ChatModalProps> = ({ user, onAction }) => {
  const { account } = useEthers();
  const { control, handleSubmit, setValue } = useForm<FormData>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      const { username } = user;
      setValue('nick', username);
    }
  }, [setValue, user]);

  const onSubmit = WithAsyncErrorBoundary(async (data: FormData) => {
    if (!account) return;

    setLoading(true);

    await onAction({
      nickName: data.nick,
      participant: account,
      key: data.key,
      stamp: data.stamp,
    });

    setLoading(false);
  });

  return (
    <div className="chat-modal">
      {!account ? (
        <p>Please connect your wallet to start chatting</p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <FormContainer className="chat-form">
            {formFields.slice(0, 3).map((field) => (
              <React.Fragment key={field.name}>
                {field.name === 'nick' && <p>Your're already registered to this chat</p>}
                <ControllerTextInput
                  control={control}
                  disabled={field.name === 'nick' ? !!user : undefined}
                  {...field}
                />
              </React.Fragment>
            ))}
            <Button type="submit">{!loading ? 'Join' : <CircularProgress />}</Button>
          </FormContainer>
        </form>
      )}
    </div>
  );
};
