import { Container, type ContainerProps } from '../components/Container';

export function Flex({ className = '', ...props }: ContainerProps) {
  return <Container className={`aca-flex flex ${className}`} {...props} />;
}
