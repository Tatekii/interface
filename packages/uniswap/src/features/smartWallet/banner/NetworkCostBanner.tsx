import { useCallback } from 'react'
import { Trans } from 'react-i18next'
import { Flex, Text, TouchableArea } from 'ui/src'
import { ExternalLink } from 'ui/src/components/icons/ExternalLink'
import { SmartWallet } from 'ui/src/components/icons/SmartWallet'
import { openUri } from 'uniswap/src/utils/linking'

const onPressLearnMore = (url: string): Promise<void> => openUri(url)

type NetworkCostBannerProps = {
  bannerText: string
  url: string
}

export function NetworkCostBanner({ bannerText, url }: NetworkCostBannerProps): JSX.Element {
  const handleOnPress = useCallback(() => onPressLearnMore(url), [url])

  return (
    <TouchableArea
      row
      centered
      borderWidth="$spacing1"
      borderColor="$surface3"
      borderRadius="$rounded12"
      p="$padding16"
      gap="$gap12"
      onPress={handleOnPress}
    >
      <Flex row>
        <SmartWallet color="$accent1" size="$icon.24" />
      </Flex>
      <Flex grow flexBasis={0}>
        <Text variant="body3" color="$neutral2">
          <Trans i18nKey={bannerText} />
        </Text>
      </Flex>
      <ExternalLink color="$neutral3" size="$icon.16" />
    </TouchableArea>
  )
}
