// Bu sekme doğrudan açılmaz; sekme düğmesine basıldığında /post/new modalı açılır.
import { Redirect } from 'expo-router';

export default function ComposeTab() {
  return <Redirect href="/feed" />;
}
