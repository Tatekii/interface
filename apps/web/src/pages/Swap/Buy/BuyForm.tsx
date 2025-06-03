import { useAccount } from 'hooks/useAccount'
import { BuyFormButton } from 'pages/Swap/Buy/BuyFormButton'
import { BuyFormContextProvider, useBuyFormContext } from 'pages/Swap/Buy/BuyFormContext'
import { ChooseProviderModal } from 'pages/Swap/Buy/ChooseProviderModal'
import { CountryListModal } from 'pages/Swap/Buy/CountryListModal'
import { FiatOnRampCurrencyModal } from 'pages/Swap/Buy/FiatOnRampCurrencyModal'
import { PredefinedAmount } from 'pages/Swap/Buy/PredefinedAmount'
import { fallbackCurrencyInfo } from 'pages/Swap/Buy/hooks'
import { formatFiatOnRampFiatAmount } from 'pages/Swap/Buy/shared'
import { AlternateCurrencyDisplay } from 'pages/Swap/common/AlternateCurrencyDisplay'
import { SelectTokenPanel } from 'pages/Swap/common/SelectTokenPanel'
import {
  NumericalInputMimic,
  NumericalInputSymbolContainer,
  NumericalInputWrapper,
  StyledNumericalInput,
  useWidthAdjustedDisplayValue,
} from 'pages/Swap/common/shared'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Flex, Text, styled, useShadowPropsShort } from 'ui/src'
import { nativeOnChain } from 'uniswap/src/constants/tokens'
import { useUrlContext } from 'uniswap/src/contexts/UrlContext'
import { TradeableAsset } from 'uniswap/src/entities/assets'
import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { usePortfolioBalances } from 'uniswap/src/features/dataApi/balances'
import { useAppFiatCurrency, useFiatCurrencyComponents } from 'uniswap/src/features/fiatCurrency/hooks'
import { FiatOnRampCountryPicker } from 'uniswap/src/features/fiatOnRamp/FiatOnRampCountryPicker'
import { useFiatOnRampAggregatorGetCountryQuery } from 'uniswap/src/features/fiatOnRamp/api'
import { FiatOnRampCurrency, RampDirection } from 'uniswap/src/features/fiatOnRamp/types'
import Trace from 'uniswap/src/features/telemetry/Trace'
import {
  FiatOffRampEventName,
  FiatOnRampEventName,
  InterfacePageNameLocal,
} from 'uniswap/src/features/telemetry/constants'
import { sendAnalyticsEvent } from 'uniswap/src/features/telemetry/send'
import { TestID } from 'uniswap/src/test/fixtures/testIDs'
import { currencyId } from 'uniswap/src/utils/currencyId'
import useResizeObserver from 'use-resize-observer'
import { useFormatter } from 'utils/formatNumbers'

const InputWrapper = styled(Flex, {
  backgroundColor: '$surface1',
  p: '$spacing16',
  pt: '$spacing12',
  pb: 52,
  height: 264,
  alignItems: 'center',
  borderRadius: '$rounded20',
  justifyContent: 'space-between',
  overflow: 'hidden',
  gap: '$spacing8',
  borderWidth: 1,
  borderColor: '$surface3',
})

const HeaderRow = styled(Flex, {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
})

const DEFAULT_FIAT_DECIMALS = 2
const PREDEFINED_AMOUNTS = [100, 300, 1000]
const PREDEFINED_PERCENTAGES = [25, 50, 75, 100]

type BuyFormProps = {
  disabled?: boolean
  initialCurrency?: TradeableAsset | null
}

function BuyFormInner({ disabled, initialCurrency }: BuyFormProps) {
  const account = useAccount()
  const { t } = useTranslation()
  const { convertToFiatAmount } = useFormatter()
  const fiatCurrency = useAppFiatCurrency()
  const { symbol: fiatSymbol } = useFiatCurrencyComponents(fiatCurrency)

  const { buyFormState, setBuyFormState, derivedBuyFormInfo } = useBuyFormContext()
  const {
    inputAmount,
    inputInFiat,
    selectedCountry,
    quoteCurrency,
    currencyModalOpen,
    countryModalOpen,
    providerModalOpen,
    rampDirection,
  } = buyFormState
  const { supportedTokens, countryOptionsResult, error, amountOut, meldSupportedFiatCurrency } = derivedBuyFormInfo

  const postWidthAdjustedDisplayValue = useWidthAdjustedDisplayValue(inputAmount)
  const hiddenObserver = useResizeObserver<HTMLElement>()

  useEffect(() => {
    const fiatValue = inputInFiat ? inputAmount : derivedBuyFormInfo.amountOut

    if (!fiatValue) {
      return
    }

    sendAnalyticsEvent(FiatOnRampEventName.FiatOnRampAmountEntered, {
      amountUSD: convertToFiatAmount(Number(fiatValue)).amount,
      source: 'textInput',
    })
  }, [inputAmount, derivedBuyFormInfo.amountOut, inputInFiat, convertToFiatAmount])

  const handleUserInput = (newValue: string) => {
    setBuyFormState((state) => ({ ...state, inputAmount: newValue }))
  }

  const { data: countryResult } = useFiatOnRampAggregatorGetCountryQuery()
  useEffect(() => {
    if (!selectedCountry && countryResult) {
      setBuyFormState((state) => ({ ...state, selectedCountry: countryResult }))
    }
  }, [buyFormState.selectedCountry, countryResult, selectedCountry, setBuyFormState])

  const { useParsedQueryString } = useUrlContext()
  const parsedQs = useParsedQueryString()
  useEffect(() => {
    let supportedToken: Maybe<FiatOnRampCurrency>
    const quoteCurrencyCode = parsedQs.quoteCurrencyCode

    if (initialCurrency) {
      const supportedNativeToken = supportedTokens?.find(
        (meldToken) =>
          meldToken.currencyInfo?.currency.chainId === initialCurrency.chainId &&
          meldToken.currencyInfo?.currency.isNative,
      )
      // Defaults the quote currency to the initial currency if supported
      supportedToken =
        supportedTokens?.find(
          (meldToken) =>
            meldToken.currencyInfo?.currency.chainId === initialCurrency.chainId &&
            meldToken.currencyInfo?.currency.isToken &&
            meldToken.currencyInfo?.currency.address === initialCurrency.address,
        ) || supportedNativeToken
    } else if (quoteCurrencyCode) {
      // Defaults the quote currency to the initial currency (from query params) if supported
      supportedToken = supportedTokens?.find((meldToken) => meldToken.meldCurrencyCode === quoteCurrencyCode)
    } else {
      supportedToken =
        supportedTokens?.find((meldToken) =>
          meldToken.currencyInfo?.currency.equals(nativeOnChain(UniverseChainId.Mainnet)),
        ) ?? supportedTokens?.[0]
    }

    if (supportedToken) {
      setBuyFormState((state) => ({
        ...state,
        quoteCurrency: supportedToken,
      }))
      return
    }
    // If connected to a non-mainnet chain, default to the native chain of that token if supported.
    const supportedNativeToken = supportedTokens?.find((meldToken) => {
      return meldToken.currencyInfo?.currency.chainId === account.chainId && meldToken.currencyInfo?.currency.isNative
    })
    if (supportedNativeToken) {
      setBuyFormState((state) => ({
        ...state,
        quoteCurrency: supportedNativeToken,
      }))
    }
  }, [account.chainId, parsedQs, initialCurrency, setBuyFormState, supportedTokens])

  const { data: balancesById } = usePortfolioBalances({ address: account.address })

  const balance = useMemo(() => {
    const currentCurrencyId = currencyId(quoteCurrency?.currencyInfo?.currency)
    return currentCurrencyId ? balancesById?.[currentCurrencyId.toLowerCase()] : undefined
  }, [balancesById, quoteCurrency?.currencyInfo?.currency])

  const shadowProps = useShadowPropsShort()
  const [inputHasFocus, setInputHasFocus] = useState(false)
  const focusProps = useMemo(
    () => ({
      backgroundColor: '$surface2',
      borderColor: 'transparent',
      ...(inputHasFocus || inputAmount
        ? { ...shadowProps, backgroundColor: '$surface1', borderColor: '$surface3' }
        : {}),
    }),
    [inputAmount, inputHasFocus, shadowProps],
  )

  return (
    <Trace page={InterfacePageNameLocal.Buy} logImpression>
      <Flex gap="$spacing4">
        <InputWrapper {...focusProps}>
          <HeaderRow>
            <Text variant="body3" userSelect="none" color="$neutral2">
              {rampDirection === RampDirection.ONRAMP ? t('common.youreBuying') : t('common.youreSelling')}
            </Text>
            <FiatOnRampCountryPicker
              onPress={() => {
                setBuyFormState((state) => ({ ...state, countryModalOpen: true }))
              }}
              countryCode={selectedCountry?.countryCode}
            />
          </HeaderRow>
          <Flex alignItems="center" gap="$spacing16" maxWidth="100%" overflow="hidden">
            {error && (
              <Text variant="body3" userSelect="none" color="$statusCritical">
                {error.message}
              </Text>
            )}
            <NumericalInputWrapper>
              {inputInFiat && (
                <NumericalInputSymbolContainer showPlaceholder={!inputAmount}>
                  {fiatSymbol}
                </NumericalInputSymbolContainer>
              )}
              <StyledNumericalInput
                value={postWidthAdjustedDisplayValue}
                disabled={disabled}
                onUserInput={handleUserInput}
                onFocus={() => setInputHasFocus(true)}
                onBlur={() => setInputHasFocus(false)}
                placeholder="0"
                $width={inputAmount && hiddenObserver.width ? hiddenObserver.width + 1 : undefined}
                maxDecimals={
                  inputInFiat
                    ? DEFAULT_FIAT_DECIMALS
                    : quoteCurrency?.currencyInfo?.currency.decimals ?? DEFAULT_FIAT_DECIMALS
                }
                testId={TestID.BuyFormAmountInput}
              />
              <NumericalInputMimic ref={hiddenObserver.ref}>{inputAmount}</NumericalInputMimic>
            </NumericalInputWrapper>
            {quoteCurrency?.currencyInfo?.currency && inputAmount && (
              <Flex height={36} justifyContent="center">
                <AlternateCurrencyDisplay
                  disabled={disabled || !amountOut}
                  inputCurrency={quoteCurrency.currencyInfo.currency}
                  inputInFiat={inputInFiat}
                  exactAmountOut={amountOut}
                  onToggle={() => {
                    setBuyFormState((state) => ({
                      ...state,
                      inputInFiat: !state.inputInFiat,
                      inputAmount: amountOut || '',
                    }))
                  }}
                />
              </Flex>
            )}
            {!inputAmount && rampDirection === RampDirection.ONRAMP && (
              <Flex row alignItems="center" gap="$spacing8" justifyContent="center">
                {PREDEFINED_AMOUNTS.map((amount: number) => (
                  <PredefinedAmount
                    onPress={() => {
                      setBuyFormState((state) => ({
                        ...state,
                        inputInFiat: true,
                        inputAmount: amount.toString(),
                      }))
                      sendAnalyticsEvent(FiatOnRampEventName.FiatOnRampAmountEntered, {
                        amountUSD: convertToFiatAmount(amount).amount,
                        source: 'chip',
                      })
                    }}
                    key={amount}
                    label={formatFiatOnRampFiatAmount(amount, meldSupportedFiatCurrency ?? fallbackCurrencyInfo)}
                    disabled={disabled}
                  />
                ))}
              </Flex>
            )}
            {!inputAmount && rampDirection === RampDirection.OFFRAMP && (
              <Flex row alignItems="center" gap="$spacing8" justifyContent="center">
                {PREDEFINED_PERCENTAGES.map((value: number) => (
                  <PredefinedAmount
                    key={value}
                    label={value === 100 ? t('common.max') : `${value}%`}
                    disabled={disabled || !balance?.balanceUSD}
                    onPress={() => {
                      if (!balance) {
                        return
                      }
                      const newInputAmount = (balance.quantity * value) / 100
                      setBuyFormState((state) => ({
                        ...state,
                        inputInFiat: false,
                        inputAmount: String(newInputAmount),
                      }))
                      sendAnalyticsEvent(FiatOffRampEventName.FiatOffRampAmountEntered, {
                        amountUSD: convertToFiatAmount(newInputAmount).amount,
                        source: 'chip',
                      })
                    }}
                  />
                ))}
              </Flex>
            )}
          </Flex>
        </InputWrapper>
        <SelectTokenPanel
          currency={quoteCurrency?.currencyInfo?.currency}
          balance={balance}
          disabled={disabled}
          testID={TestID.ChooseInputToken}
          onPress={() => {
            setBuyFormState((state) => ({ ...state, currencyModalOpen: true }))
          }}
          {...focusProps}
        />
        <Flex row>
          <BuyFormButton />
        </Flex>
      </Flex>
      {supportedTokens && Boolean(supportedTokens?.length) && (
        <FiatOnRampCurrencyModal
          isOpen={currencyModalOpen}
          onDismiss={() => {
            setBuyFormState((state) => ({ ...state, currencyModalOpen: false }))
          }}
          onSelectCurrency={(currency) => {
            setBuyFormState((state) => ({ ...state, quoteCurrency: currency }))
            sendAnalyticsEvent(FiatOnRampEventName.FiatOnRampTokenSelected, {
              token:
                currency.meldCurrencyCode ??
                currency.moonpayCurrencyCode ??
                currency.currencyInfo?.currency.symbol ??
                '',
            })
          }}
          currencies={supportedTokens}
        />
      )}
      {countryOptionsResult?.supportedCountries && (
        <CountryListModal
          onSelectCountry={(selectedCountry) => setBuyFormState((state) => ({ ...state, selectedCountry }))}
          countryList={countryOptionsResult?.supportedCountries}
          isOpen={countryModalOpen}
          onDismiss={() => setBuyFormState((state) => ({ ...state, countryModalOpen: false }))}
          selectedCountry={selectedCountry}
        />
      )}
      {/* This modal must be conditionally rendered or page will crash on mweb */}
      {providerModalOpen && (
        <ChooseProviderModal
          isOpen={true}
          closeModal={() => setBuyFormState((prev) => ({ ...prev, providerModalOpen: false }))}
        />
      )}
    </Trace>
  )
}

export function BuyForm({ rampDirection, ...props }: BuyFormProps & { rampDirection: RampDirection }) {
  return (
    <BuyFormContextProvider rampDirection={rampDirection}>
      <BuyFormInner {...props} />
    </BuyFormContextProvider>
  )
}
