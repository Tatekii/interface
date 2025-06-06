import { useTranslation } from 'react-i18next'
import { Flex, Text } from 'ui/src'
import { getAlertColor } from 'uniswap/src/components/modals/WarningModal/getAlertColor'
import { useParsedSwapWarnings } from 'uniswap/src/features/transactions/swap/hooks/useSwapWarnings'
import { MarketPriceImpactWarningModal } from 'uniswap/src/features/transactions/swap/review/SwapDetails/MarketPriceImpactWarningModal'
import { usePriceImpact } from 'uniswap/src/features/transactions/swap/shared-components/PriceImpactRow/usePriceImpact'
import { DerivedSwapInfo } from 'uniswap/src/features/transactions/swap/types/derivedSwapInfo'
import { isBridge } from 'uniswap/src/features/transactions/swap/utils/routing'

export function PriceImpactRow({
  hide,
  derivedSwapInfo,
}: {
  hide?: boolean
  derivedSwapInfo: DerivedSwapInfo
}): JSX.Element | null {
  const { t } = useTranslation()

  const { formattedPriceImpact } = usePriceImpact({ derivedSwapInfo })
  const { priceImpactWarning } = useParsedSwapWarnings()
  const { text: priceImpactWarningColor } = getAlertColor(priceImpactWarning?.severity)

  const trade = derivedSwapInfo.trade.trade

  if (hide || !trade || isBridge(trade)) {
    return null
  }

  return (
    <Flex row alignItems="center" justifyContent="space-between">
      <MarketPriceImpactWarningModal routing={trade.routing} missing={!formattedPriceImpact}>
        <Flex centered row gap="$spacing4">
          <Text color="$neutral2" variant="body3">
            {t('swap.priceImpact')}
          </Text>
        </Flex>
      </MarketPriceImpactWarningModal>
      <Flex row shrink justifyContent="flex-end">
        <Text adjustsFontSizeToFit color={priceImpactWarningColor} variant="body3">
          {formattedPriceImpact ?? 'N/A'}
        </Text>
      </Flex>
    </Flex>
  )
}
