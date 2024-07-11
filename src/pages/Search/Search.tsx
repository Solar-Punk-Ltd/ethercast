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
