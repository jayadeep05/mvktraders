package com.enterprise.investmentanalytics.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UpdateUserRequest {
    private String name;
    private String email;
    private String mobile;
    private String password;
    private String status;
    private String city; // Included just in case we add it to entity later, or if it's there
}
