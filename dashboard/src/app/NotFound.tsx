import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button, EmptyState } from '../ui';
import { paths } from './navigation';

export function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="grid h-full place-items-center">
      <EmptyState
        icon={Compass}
        title="Nothing here"
        description="This link may be out of date."
        action={
          <Button variant="primary" onClick={() => navigate(paths.today)}>
            Go to Today
          </Button>
        }
      />
    </div>
  );
}
