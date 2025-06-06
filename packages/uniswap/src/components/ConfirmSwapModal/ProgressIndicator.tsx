import { useMemo } from 'react'
import { Flex, Separator } from 'ui/src'
import {
  TokenApprovalTransactionStepRow,
  TokenRevocationTransactionStepRow,
} from 'uniswap/src/components/ConfirmSwapModal/steps/Approve'
import { LPTransactionStepRow } from 'uniswap/src/components/ConfirmSwapModal/steps/LP'
import {
  Permit2SignatureStepRow,
  Permit2TransactionStepRow,
} from 'uniswap/src/components/ConfirmSwapModal/steps/Permit'
import { SwapTransactionStepRow } from 'uniswap/src/components/ConfirmSwapModal/steps/Swap'
import { WrapTransactionStepRow } from 'uniswap/src/components/ConfirmSwapModal/steps/Wrap'
import { StepStatus } from 'uniswap/src/components/ConfirmSwapModal/types'
import { TransactionStep, TransactionStepType } from 'uniswap/src/features/transactions/steps/types'

interface ProgressIndicatorProps {
  steps: TransactionStep[]
  currentStep?: { step: TransactionStep; accepted: boolean }
}

function areStepsEqual(currentStep: TransactionStep | undefined): (step: TransactionStep) => boolean {
  return (step: TransactionStep) => {
    if (step.type !== currentStep?.type) {
      return false
    }

    // There can be multiple approval steps with different tokens so both the type and the approval has to match
    if (currentStep.type === TransactionStepType.TokenApprovalTransaction) {
      return step.type === TransactionStepType.TokenApprovalTransaction && step.token === currentStep.token
    }

    return true
  }
}

export function ProgressIndicator({ currentStep, steps }: ProgressIndicatorProps): JSX.Element | null {
  function getStatus(targetStep: TransactionStep): StepStatus {
    const currentIndex = steps.findIndex(areStepsEqual(currentStep?.step))
    const targetIndex = steps.indexOf(targetStep)
    if (currentIndex < targetIndex) {
      return StepStatus.Preview
    } else if (currentIndex === targetIndex) {
      return currentStep?.accepted ? StepStatus.InProgress : StepStatus.Active
    } else {
      return StepStatus.Complete
    }
  }

  const counts = useMemo(() => {
    return steps.reduce(
      (acc, step) => {
        acc[step.type] = (acc[step.type] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )
  }, [steps])

  const typeIndices = useMemo(() => {
    const indices: Record<string, number> = {}
    return steps.map((step) => {
      indices[step.type] = indices[step.type] || 0
      const typeIndex = indices[step.type]
      indices[step.type]++
      return typeIndex
    })
  }, [steps])

  if (steps.length === 0) {
    return null
  }

  return (
    <Flex px="$spacing12" enterStyle={{ opacity: 0 }} animation="quicker">
      <Separator my="$spacing12" />
      {steps.map((step, i) => (
        <Flex key={`progress-indicator-step-${i}`}>
          <Step step={step} status={getStatus(step)} index={typeIndices[i] as number} count={counts[step.type]} />
          {i !== steps.length - 1 && <Flex backgroundColor="$neutral3" height={10} mt={1} mx={11} width={2} />}
        </Flex>
      ))}
    </Flex>
  )
}

function Step({
  step,
  status,
  index,
  count,
}: {
  step: TransactionStep
  status: StepStatus
  index: number
  count?: number
}): JSX.Element {
  switch (step.type) {
    case TransactionStepType.WrapTransaction:
      return <WrapTransactionStepRow step={step} status={status} />
    case TransactionStepType.TokenApprovalTransaction:
      return <TokenApprovalTransactionStepRow step={step} status={status} />
    case TransactionStepType.TokenRevocationTransaction:
      return <TokenRevocationTransactionStepRow step={step} status={status} />
    case TransactionStepType.Permit2Signature:
      return <Permit2SignatureStepRow step={step} status={status} />
    case TransactionStepType.Permit2Transaction:
      return <Permit2TransactionStepRow step={step} status={status} index={index} count={count} />
    case TransactionStepType.SwapTransaction:
    case TransactionStepType.SwapTransactionAsync:
    case TransactionStepType.UniswapXSignature:
      return <SwapTransactionStepRow step={step} status={status} />
    case TransactionStepType.IncreasePositionTransaction:
    case TransactionStepType.IncreasePositionTransactionAsync:
    case TransactionStepType.DecreasePositionTransaction:
      return <LPTransactionStepRow step={step} status={status} />
    case TransactionStepType.MigratePositionTransaction:
    case TransactionStepType.MigratePositionTransactionAsync:
    case TransactionStepType.CollectFeesTransactionStep:
      return <LPTransactionStepRow step={step} status={status} />
    default:
      // Return a fallback UI if no matching case is found
      return <></>
  }
}
