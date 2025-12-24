package com.enterprise.investmentanalytics.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CreateClientRequest {
    private String fullName;
    private String phoneNumber;
    private String city;
    private BigDecimal investmentAmount;
    private Double percentageOffered;
    private String password;
}
