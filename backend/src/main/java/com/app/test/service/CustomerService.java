package com.app.test.service;

import com.app.test.beans.dto.request.CustomerRequest;
import com.app.test.beans.dto.response.CustomerResponse;
import com.app.test.beans.dto.response.PageResponse;
import com.app.test.beans.dto.response.base.ResponseModelDto;
import com.app.test.model.MsCustomer;

public interface CustomerService {

    ResponseModelDto<PageResponse<CustomerResponse>> search(
            String keyword,
            int page,
            int size
    );

    public ResponseModelDto<MsCustomer> create(CustomerRequest request);

    public ResponseModelDto<CustomerResponse> update(CustomerRequest request);

    public ResponseModelDto<MsCustomer> delete(CustomerRequest request);

}
