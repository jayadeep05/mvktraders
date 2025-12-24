package com.enterprise.investmentanalytics.dto.request;

import com.enterprise.investmentanalytics.model.enums.ProfitAccrualStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ProfitConfigRequest {
    private BigDecimal profitPercentage;
    private ProfitAccrualStatus status;
}
