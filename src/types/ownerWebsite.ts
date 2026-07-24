export interface WebsiteSection {
  name: string;
  status: string;
  visible: boolean;
}

export interface WebsiteConfig {
  slug: string;
  isPublished: boolean;
  businessName: string;
  templateName: string;
  lastUpdated: string;
  sections: WebsiteSection[];
}
