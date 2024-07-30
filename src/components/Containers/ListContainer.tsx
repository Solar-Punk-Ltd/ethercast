import './ListContainer.scss';

interface ListContainerProps {
  children: React.ReactNode;
}

export function ListContainer({ children }: ListContainerProps) {
  return <div className="list-container">{children}</div>;
}
