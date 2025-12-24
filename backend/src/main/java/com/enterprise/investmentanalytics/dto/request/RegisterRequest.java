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
    private String email;
    private String password;
    private String mobile;
    private Role role;
    private String userId;
}
