"use client"

import { ExternalLinkIcon } from "lucide-react"
import { TflApiKeyField } from "@/components/tfl-api-key-field"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TFL_API_PORTAL_PRODUCT_URL } from "@/components/user-tfl-api-key-copy"
import { useUserTflCredentials } from "@/components/user-tfl-credentials-provider"
import { TEXT_LINK_CLASS, TEXT_LINK_ICON_CLASS } from "@/lib/text-link"
import { cn } from "@/lib/utils"

/**
 * Dialog to paste / replace / clear a visitor TfL API key.
 * Keys are validated with a browser request to api.tfl.gov.uk — never posted here.
 */
export const UserTflCredentialsDialog = () => {
  const { dialogOpen, setDialogOpen } = useUserTflCredentials()

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent
        data-user-tfl-credentials-dialog=""
        className="gap-4 sm:max-w-md"
      >
        <DialogHeader className="gap-1.5 pr-8">
          <DialogTitle
            id="user-tfl-key-heading"
            className="text-pretty font-heading text-sm font-medium"
          >
            Get a free TfL API key from{" "}
            <a
              href={TFL_API_PORTAL_PRODUCT_URL}
              className={TEXT_LINK_CLASS}
              target="_blank"
              rel="noopener noreferrer"
            >
              api-portal.tfl.gov.uk
              <ExternalLinkIcon className={cn(TEXT_LINK_ICON_CLASS, "ml-1")} aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </a>{" "}
            and come back
          </DialogTitle>
          <DialogDescription className="sr-only">
            Paste your TfL API key. It stays in this browser.
          </DialogDescription>
        </DialogHeader>
        <TflApiKeyField id="user-tfl-key" labelledBy="user-tfl-key-heading" />
      </DialogContent>
    </Dialog>
  )
}
