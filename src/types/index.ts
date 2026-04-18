export interface ListItem {
  id: string;
  content: string;
  type: 'location' | 'keyword';
  items?: string[];
}