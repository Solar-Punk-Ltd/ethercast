import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { Button } from '../../components/Button/Button';
import { FormContainer } from '../../components/FormContainer/FormContainer';
import { ControllerTextInput } from '../../components/TextInput/ControllerTextInput';
import { WithErrorBoundary } from '../../hooks/WithErrorBoundary';
import { assertAtLeastFourChars, assertPublicAddress } from '../../utils/formValidation';

import './Search.scss';

interface FormData {
  walletAddress: string;
  streamTopic: string;
  /*   timeslice: string;
  minLiveThreshold: string;
  initBufferTime: string;
  buffer: string;
  dynamicBufferIncrement: string; */
}

const formFields = [
  {
    name: 'walletAddress',
    label: 'Please add the public address that streams the feed',
    defaultValue: '',
    rules: { required: 'Wallet address is required', validate: assertPublicAddress },
  },
  {
    name: 'streamTopic',
    label: 'This is how others will find your stream',
    defaultValue: '',
    rules: { required: 'Topic is required', validate: assertAtLeastFourChars },
  },
  /*   {
    name: 'timeslice',
    label: 'Set the timeslice',
    defaultValue: '2000',
    rules: { required: 'Timeslice is required', validate: assertPositiveInteger },
  },
  {
    name: 'minLiveThreshold',
    label: 'Set the min live threshold',
    defaultValue: '1',
    rules: { required: 'Min live threshold is required', validate: assertPositiveInteger },
  },
  {
    name: 'initBufferTime',
    label: 'Set the init buffer time',
    defaultValue: '5000',
    rules: { required: 'Init buffer time is required', validate: assertPositiveInteger },
  },
  {
    name: 'buffer',
    label: 'Set the buffer',
    defaultValue: '5',
    rules: { required: 'Buffer is required', validate: assertPositiveInteger },
  },
  {
    name: 'dynamicBufferIncrement',
    label: 'Set the dynamic buffer increment',
    defaultValue: '0',
    rules: { required: 'Dynamic buffer increment is required', validate: assertPositiveInteger },
  }, */
];

export function Search() {
  const navigate = useNavigate();
  const { control, handleSubmit } = useForm<FormData>();

  const onSubmit = WithErrorBoundary((data: FormData) => {
    navigate(`/watch?a=${data.walletAddress}&t=${data.streamTopic}`);
  });

  return (
    <div className="search">
      <form onSubmit={handleSubmit(onSubmit)}>
        <FormContainer className="search-form">
          {formFields.map((field) => (
            <ControllerTextInput key={field.name} control={control} {...field} />
          ))}
          <Button type="submit">Find stream</Button>
        </FormContainer>
      </form>
    </div>
  );
}
