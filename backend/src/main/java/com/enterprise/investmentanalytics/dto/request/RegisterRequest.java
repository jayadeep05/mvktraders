package com.enterprise.investmentanalytics.dto.request;

import com.enterprise.investmentanalytics.model.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class RegisterRequest {
    private String name;
    private String fullName; // Map to name
    private String email;
    private String password;
    private String mobile;
    private String phoneNumber; // Map to mobile
    private Role role;
    private String userId;
    private String city;
    private java.math.BigDecimal investmentAmount;
    private java.math.BigDecimal percentageOffered;
}
